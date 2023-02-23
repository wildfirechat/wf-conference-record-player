#!/usr/local/bin/perl

sub usage() {
  print "\nUsage: creatematrix.pl  [2|3|4|5|6] [row|col]\n";
  print "       where num is the size of the created matrix\n";
  print "       and row or col specifies major order (default is row)\n";
  print "       Sizes are as follows:\n";
  print "         2 = vga   (640x480)  2 videos (2x2)\n";
  print "         3 = qvga  (320x240)  9 videos (3x3 default)\n";
  print "         4 = qvga  (320x240) 16 videos (4x4)\n";
  print "         5 = qqvga (160x120) 25 videos (5x5)\n";
  print "         6 = qqvga (160x120) 36 videos (5x5)\n";
  print "  Files are looked for in the ./videos directory.\n\n";
  exit;
}

if ($ARGV[0] =~ /\-h/i ||
    $ARGV[0] =~ /\-\-help/i ||
    $ARGV[0] =~ /\-\?/) { usage; }


$matrix_size = $ARGV[0];
$order_parm = $ARGV[1];

print "#!/bin/sh\n";

print "\n# Start of Program\n\n";

print "# matrix_size = [$matrix_size]\n";
print "# order_parm  = [$order_parm]\n";

$matrixvar = ($matrix_size ? $matrix_size :   3  );
$ordervar  = ($order_parm  ? $order_parm  : "row");

if ($matrixvar > 6 ) { $matrixvar = 6; }
if ($matrixvar < 2 ) { $matrixvar = 2; }


$maxcount = $matrixvar * $matrixvar;

if ($ordervar ne "row" && $ordervar ne "col") { $ordervar = "row" }

$path = "./videos";

print "# matrixvar = [$matrixvar]\n";
print "# ordervar  = [$ordervar]\n";
print "# maxcount  = [$maxcount]\n";
print "# path      = [$path]\n";




opendir(TDIR, $path);
@files = grep { /\.mkv$/ } readdir(TDIR);

$count = $#files;  # count of array is zero based

$inputcount = $count +1;

print "# There are $inputcount files in $path\n";

# constrain max files to our matrix size
if ($inputcount > $maxcount) { $inputcount = $maxcount; }
printf "# We will only use [$inputcount] files.\n";


#foreach $file (sort @files) {
#   print "${path}/${file}\n";
#}


closedir(TDIR);

#
# Build the ffmpeg command in sections what will be printed as we go
#
# prelude:  ffmpeg command and any options
#
# inputs: a list of "-i file"  entries
#
# filter definition with streams
#   -filter_complex "
#     [0:v] setpts=PTS-STARTPTS, scale=40x30 [a];
#   "
#
# the xstack command line of the form:
# [a][b][c][d][e][f][g][h][i]xstack=inputs=9:layout=0_0|w0_0|w0+w1_0|0_h0|w0_h0|w0+w1_h0|0_h0+h1|w0_h0+h1|w0+w1_h0+h1[out]  \
#
# postlude: the remaining bits and pipe to ffplay:
#
#  -map "[out]" \
#  -c:v libx264 -f matroska -  | ffplay  -left 10 -top 10  -
#

##### prelude ######

$cmd_prelude="\nffmpeg \\";

print "$cmd_prelude\n";


###### inputs ######

$cmd_inputs = "";

@sortedfiles = (sort @files);
%HoF = ();

#foreach $file ( @sortedfiles ) {
#   $cmd_inputs .=  "  -i " . "${path}/${file} \\\n";
#}

# inputcount has been constrained to the max matrix size (see above)

# get a file from the @files list and format it
# also, create the key for the HashOfFiles HoF

for($c = 0, $fkey = 1; $c < $inputcount; $c++, $fkey++) {
  $file = shift @sortedfiles;
  $fqpath = "${path}/${file}";
  $cmd_inputs .= "   -i " . "$fqpath \\\n";
  $tkey = sprintf("%02d",$fkey);
  $HoF{$tkey} = $fqpath;
}

# no \n next line
print "$cmd_inputs";


###### filter definition ######

$filter_complex="  -filter_complex \" \\\n";
$labellist = "";

# make sure the scale is set correctly for large matricies.  size >= 5x5 gets qqvga.

$scalevar = ($matrixvar >= 5 ? "qqvga" : "qvga");


for($i = 0, $c = $inputcount; $c > 0; $c--, $i++) {
  $id=$i + 1;
  # use the below filter definition to insert a yellow id in the upper left of each video
  # $filter_complex .= "      [$i\:v] setpts=PTS-STARTPTS, scale=$scalevar, drawtext=\"text=\'$id\':fontsize=20:fontcolor=yellow\" [a$i]; \\\n";

  # use the below filter definition for no no id 
  $filter_complex .= "      [$i\:v] setpts=PTS-STARTPTS, scale=$scalevar [a$i]; \\\n";
  $labellist .= "[a$i]";

}

# no \n next two lines
print "$filter_complex";
print "      $labellist";


###### xstack command line ######

# no \n next two lines
$xstack_stem="xstack=inputs=$inputcount\:layout=";
print "$xstack_stem";

# call a function to format all needed elements of the xstack spec

$xspec = xstackspec($inputcount,$matrixvar,$matrixvar,$ordervar);

print "$xspec \\\n";


###### postlude ######


$cmd_postlude = "      \" \\
    -map \"[out]\" \\
    -c:v libx264 -t '30' -f matroska -  \| ffplay -autoexit -left 10 -top 10  - ";


print "$cmd_postlude\n\n";


print "\n# End of Program\n";

# print the HoF hash here
#foreach $f (sort keys(%HoF)) {
#  print "# Hof{$f} == $HoF{$f}\n";
#}


#
#
#print "Input a line: ";
#
#while(<STDIN>) {
#
#
#  $inputline = $_;
#  chop $inputline;
#
#  print "inputline = [$inputline]\n";
#
#
#  my @nspecs = split/,/,$inputline;
#
#  foreach my $spec (@nspecs) {
##    print "spec: [$spec]\n";
#    if($spec =~ /\s*(\d+)\-(\d+)\s*$/) {
#      my $s1 = $1;
#      my $s2 = $2;
#
#      for(my $i = $s1; $i <= $2; $i++) {
#        $outnum = sprintf("%02d",$i);
#        $HoN{$outnum} = $outnum;
##        print "$i\n";
#      }
#    }
#    elsif ($spec =~ /\s*(\d+)\s*$/) {
#      my $s1 = $1;
#      $outnum = sprintf("%02d",$s1);
#      $HoN{$outnum} = $outnum;
##      print "$s1\n";
#    }
#    else {
#      print STDERR "### MALFORMED number spec [$spec]\n";
#    }
#  }
#
#  foreach my $z (sort keys(%HoN)) {
#    print "HoN{$z} == [$HoN{$z}]\n";
#  }
#
#
#
#
#
#
#  print "\n***** DELETE LIST  *****\n\n";
#
#  foreach my $z (sort keys(%HoN)) {
#    $delcandidate = $HoN{$z};
#    print "file[$delcandidate] : [$HoF{$delcandidate}]\n";
#  }
#
#
#
#  %HoN = ();
#  print "Input a line: ";
#
#}
#
#
#


sub xstackspec {
  my ($incount, $nrows, $ncols, $ord) = @_;

#  print "xstackspec: [$incount], [$nrows], [$ncols] [$ord]\n";

  my $returnspec = "";

  $wspec = "";
  $hspec = "";

# outer loop

  for($x = 0; $x < $ncols; $x++) {

     WSWITCH: {
        if($x == 0) { $wspec = "0";
#                      print "[$wspec]\n";
                      last WSWITCH;
                    }
        if($x == 1) { $wspec = "w0";
#                      print "[$wspec]\n";
                      last WSWITCH;
                    }
        if($x >  1) { $xprev = $x - 1;
                      $wspec = "$wspec+w${xprev}";
#                      print "[$wspec]\n";
                      last WSWITCH;
                    }
        $nothing = 1;
     }

     $nothing = 1;
  
# inner loop
# decrement $incount here and jump out when
# we are done

    for($y = 0; $y < $nrows; $y++, $incount--) {
      #print "($x,$y) ";

       HSWITCH: {
          if($y == 0) { $hspec = "0";
#                       print "[$hspec]\n";
                        last HSWITCH;
                      }
          if($y == 1) { $hspec = "h0";
#                       print "[$hspec]\n";
                        last HSWITCH;
                      }
          if($y >  1) { $yprev = $y - 1;
                        $hspec = $hspec . "+h${yprev}";
#                       print "[$hspec]\n";
                        last HSWITCH;
                      }
          $nothing = 1;
       }

     $nothing = 1;

    # The above code is written in COLUMN MAJOR order.
    # If ROW MAJOR order is desired, perform the switch here.
    # Swap the specs around and exchange  w <-> h 

     if ($ord eq "row") {
        $left = $hspec;
        $right = $wspec;
        $left =~ s/h/w/g;
        $right =~ s/w/h/g;
#       print "${left}_${right}\|";
        $returnspec .= "${left}_${right}\|";
     }
     else {
#       print "${wspec}_${hspec}\|";
        $returnspec .= "${wspec}_${hspec}\|";
     }


     # if we just did the last one, bail out
     if ($incount == 1) { goto CUTOFF };

     } # end for y

  } # end for x

# print "returnspec = [$returnspec]\n";

# take off the last character (extra '|')

CUTOFF:

  chop $returnspec;

# Add the [out] label

  $returnspec .= "[out]";

  return $returnspec;

}


